import boto3
import os


def list_s3_files(bucket_name: str, prefix: str = ""):
    s3 = boto3.client(
        "s3",
        aws_access_key_id="AKIA4GZZDHT4EVS3ZVQN",
        aws_secret_access_key="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",
        region_name=os.getenv("AWS_REGION", "us-east-2"),
    )

    try:
        response = s3.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix  # optional: acts like folder filter
        )

        if "Contents" not in response:
            print("No files found")
            return

        for obj in response["Contents"]:
            print(obj["Key"])

    except Exception as e:
        print("Error:", str(e))


# 🔹 Usage
list_s3_files("procurement-label-detection-bucket")

# 🔹 Example with folder
# list_s3_files("your-bucket-name", prefix="screenshots/")